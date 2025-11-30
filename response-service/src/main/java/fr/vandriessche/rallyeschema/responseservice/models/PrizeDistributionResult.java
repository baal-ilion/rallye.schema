package fr.vandriessche.rallyeschema.responseservice.models;

import java.util.ArrayList;
import java.util.List;

public class PrizeDistributionResult {

    private PrizeAssignment generalPrize;
    private List<PrizeAssignment> groupPrizes = new ArrayList<>();

    public PrizeDistributionResult() {
    }

    public PrizeAssignment getGeneralPrize() {
        return generalPrize;
    }

    public void setGeneralPrize(PrizeAssignment generalPrize) {
        this.generalPrize = generalPrize;
    }

    public List<PrizeAssignment> getGroupPrizes() {
        return groupPrizes;
    }

    public void setGroupPrizes(List<PrizeAssignment> groupPrizes) {
        this.groupPrizes = groupPrizes;
    }

    public void addGroupPrize(PrizeAssignment assignment) {
        if (this.groupPrizes == null) {
            this.groupPrizes = new ArrayList<>();
        }
        this.groupPrizes.add(assignment);
    }
}
