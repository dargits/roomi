/**
 * Re-export từ configs/axiosConfig.ts để đảm bảo backward compatibility.
 *
 * Toàn bộ code hiện tại import từ '../services/api' vẫn hoạt động bình thường.
 * Config thực sự nằm tại: src/configs/axiosConfig.ts
 *
 * @deprecated Prefer importing directly from '../configs' in new code.
 */
export { default, extractErrorMessage } from '../configs/axiosConfig';
