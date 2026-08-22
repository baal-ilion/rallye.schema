import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { ApplicationUpdateService } from 'src/app/services/application-update.service';
import { sameData } from 'src/app/shared/data-change.utils';
import { HalLink } from '../../models/hal-link';
import { StageParam } from '../models/stage-param';
import { NewStageParamComponent } from '../new-stage-param/new-stage-param.component';
import { StageParamService } from '../stage-param.service';
import { DialogService } from 'src/app/shared/dialog/dialog.service';
import { ConfirmationDialogService } from 'src/app/confirmation-dialog/confirmation-dialog.service';

interface StageParamDetail {
  param: StageParam;
  nbQuestion: number;
  nbPerformance: number;
  nbResponceFile: number;
}

interface GroupedStageParamDetail {
  groupName: string;
  items: StageParamDetail[];
}

@Component({
  selector: 'app-list-stage-param',
  templateUrl: './list-stage-param.component.html',
  styleUrls: ['./list-stage-param.component.scss']
})
export class ListStageParamComponent implements OnInit, OnDestroy {
  stageParamDetails: StageParamDetail[] = [];
  groupedStageParamDetails: GroupedStageParamDetail[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private stageParamService: StageParamService,
    private dialogService: DialogService,
    private confirmationDialogService: ConfirmationDialogService,
    private applicationUpdates: ApplicationUpdateService) { }

  ngOnInit() {
    this.loadStageParamDetails();
    this.applicationUpdates.updates$.pipe(
      filter(update => update.domain === 'CONFIGURATION' || update.domain === 'DATABASE' || update.domain === 'RESYNC'),
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadStageParamDetails());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadStageParamDetails() {
    try {
      const nextDetails: StageParamDetail[] = [];
      const stageParams = await this.stageParamService.getStageParams().toPromise();
      for (const stageParam of stageParams?._embedded?.stageParams ?? []) {
        const stageParamDetail: StageParamDetail = {
          param: stageParam,
          nbPerformance: 0,
          nbQuestion: 0,
          nbResponceFile: (stageParam._links?.responseFileParams as HalLink[])?.length ?? 0
        };
        for (const questionParam of Object.values(stageParam.questionParams)) {
          if (questionParam.type === 'QUESTION') {
            stageParamDetail.nbQuestion += 1;
          } else if (questionParam.type === 'PERFORMANCE') {
            stageParamDetail.nbPerformance += 1;
          }
        }
        nextDetails.push(stageParamDetail);
      }

      if (!sameData(this.stageParamDetails, nextDetails)) {
        this.stageParamDetails = nextDetails;
        this.buildGroupedStageParamDetails();
      }

    } catch (error) {
      console.log(error);
    }
  }

  private buildGroupedStageParamDetails(): void {
    const groupsMap = new Map<string, StageParamDetail[]>();

    this.stageParamDetails.forEach(detail => {
      const param: any = detail.param as any;

      // On essaie d'abord param.group.name, sinon groupName, sinon "Sans groupe"
      const name =
        (param.group && param.group.name)
          ? param.group.name
          : (param.groupName ? param.groupName : 'Sans groupe');

      if (!groupsMap.has(name)) {
        groupsMap.set(name, []);
      }
      groupsMap.get(name)!.push(detail);
    });

    this.groupedStageParamDetails = Array.from(groupsMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'fr', { sensitivity: 'base' }))
      .map(([groupName, items]) => ({
        groupName,
        items: items.sort((a, b) => a.param.stage - b.param.stage)
      }));
  }

  async addStageParam() {
    const modalRef = this.dialogService.open<NewStageParamComponent>(NewStageParamComponent);
    try {
      const result = await modalRef.result as StageParam;
      console.log(result);
      if (!result) { return; }
      try {
        await this.stageParamService.addStageParam(result).toPromise();
        this.loadStageParamDetails();
      } catch (error) {
        console.log(error);
        this.loadStageParamDetails();
      }
    } catch (error) {
      console.log(error);
    }
  }

  trackGroup(_index: number, group: GroupedStageParamDetail): string {
    return group.groupName;
  }

  trackStageDetail(_index: number, detail: StageParamDetail): string | number {
    return detail.param.id ?? detail.param.stage;
  }

  async deleteStageParam(stageParam: StageParam): Promise<void> {
    if (!stageParam.id) {
      return;
    }
    try {
      const confirmed = await this.confirmationDialogService.confirm(
        'Suppression de l\'épreuve ' + stageParam.name,
        'Cette opération est irréversible.\nVoulez-vous supprimer l\'épreuve ' + stageParam.stage + ' - ' + stageParam.name + ' ?',
        'Oui', 'Non');
      if (confirmed) {
        await this.stageParamService.deleteStageParam(stageParam.id).toPromise();
      }
      await this.loadStageParamDetails();
    } catch (error) {
      console.log(error);
      await this.loadStageParamDetails();
    }
  }
}
