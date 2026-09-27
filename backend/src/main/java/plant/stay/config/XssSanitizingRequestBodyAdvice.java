package plant.stay.config;

import org.springframework.core.MethodParameter;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.RequestBodyAdviceAdapter;
import plant.stay.util.InputSanitizer;

import java.lang.reflect.Field;
import java.lang.reflect.Type;
import java.util.Collection;

/**
 * Tự động làm sạch toàn bộ dữ liệu chuỗi String nhận vào từ RequestBody của mọi Controller.
 * Chống triệt để XSS Injection, HTML tags độc hại, Script Injection.
 */
@RestControllerAdvice
public class XssSanitizingRequestBodyAdvice extends RequestBodyAdviceAdapter {

    @Override
    public boolean supports(MethodParameter methodParameter, Type targetType,
                            Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object afterBodyRead(Object body, HttpInputMessage inputMessage, MethodParameter parameter,
                                Type targetType, Class<? extends HttpMessageConverter<?>> converterType) {
        if (body != null) {
            sanitizeObject(body);
        }
        return body;
    }

    private void sanitizeObject(Object obj) {
        if (obj == null) return;

        if (obj instanceof Collection<?>) {
            for (Object item : (Collection<?>) obj) {
                sanitizeObject(item);
            }
            return;
        }

        Class<?> clazz = obj.getClass();
        if (clazz.getName().startsWith("java.")) return;

        while (clazz != null && clazz != Object.class) {
            for (Field field : clazz.getDeclaredFields()) {
                try {
                    field.setAccessible(true);
                    if (field.getType() == String.class) {
                        String value = (String) field.get(obj);
                        if (value != null) {
                            field.set(obj, InputSanitizer.sanitize(value));
                        }
                    } else if (!field.getType().isPrimitive() &&
                               !field.getType().getName().startsWith("java.lang") &&
                               !field.getType().getName().startsWith("java.time") &&
                               !field.getType().getName().startsWith("java.math") &&
                               !field.getType().isEnum()) {
                        Object child = field.get(obj);
                        if (child != null) {
                            sanitizeObject(child);
                        }
                    }
                } catch (Exception ignored) {
                }
            }
            clazz = clazz.getSuperclass();
        }
    }
}
