package plant.stay.service;

import plant.stay.dto.request.CashierShiftCloseRequest;
import plant.stay.dto.request.CashierShiftOpenRequest;
import plant.stay.dto.request.CashierShiftReopenRequest;
import plant.stay.dto.response.CashierShiftResponse;
import plant.stay.model.User;

import java.time.LocalDate;
import java.util.List;

public interface CashierShiftService {
    CashierShiftResponse open(CashierShiftOpenRequest request, User actor);
    CashierShiftResponse getCurrent(User actor);
    CashierShiftResponse preview(Long shiftId, User actor);
    CashierShiftResponse close(Long shiftId, CashierShiftCloseRequest request, User actor);
    CashierShiftResponse reopen(Long shiftId, CashierShiftReopenRequest request, User actor);
    CashierShiftResponse getById(Long shiftId, User actor);
    List<CashierShiftResponse> list(LocalDate date, Boolean hasDiscrepancy);
    List<CashierShiftResponse> history(User actor);
}