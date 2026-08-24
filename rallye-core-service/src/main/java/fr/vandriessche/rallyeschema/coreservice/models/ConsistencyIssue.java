package fr.vandriessche.rallyeschema.coreservice.models;

import java.util.List;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ConsistencyIssue {
    private String code;
    private String description;
    private long count;
    private List<String> ids;
    private boolean autoFixable;
    private String details;

    public ConsistencyIssue(String code, String description, long count, List<String> ids, boolean autoFixable,
            String details) {
        this.code = code;
        this.description = description;
        this.count = count;
        this.ids = ids;
        this.autoFixable = autoFixable;
        this.details = details;
    }
}
