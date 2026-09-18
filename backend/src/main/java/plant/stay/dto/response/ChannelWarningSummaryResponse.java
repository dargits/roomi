package plant.stay.dto.response;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelWarningSummaryResponse {

    private long totalChannels;
    private long activeChannels;
    private long healthyChannels;
    private long disconnectedChannels;
    private long staleChannels;
    private long pausedChannels;

    private double syncSuccessRate24h;
    private long totalSyncs24h;
    private long failedSyncs24h;

    private boolean hasWarning;
    private List<ChannelResponse> warningChannels;
}
