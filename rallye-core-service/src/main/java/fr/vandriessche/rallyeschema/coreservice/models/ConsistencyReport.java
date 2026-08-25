package fr.vandriessche.rallyeschema.coreservice.models;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;

@Data
public class ConsistencyReport {
    private List<ConsistencyIssue> issues = new ArrayList<>();
    private long autoFixApplied;
    private long remaining;
}
