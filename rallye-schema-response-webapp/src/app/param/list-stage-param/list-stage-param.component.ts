import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HalLink } from '../../models/hal-link';
import { StageParam } from '../models/stage-param';
import { NewStageParamComponent } from '../new-stage-param/new-stage-param.component';
import { StageParamService } from '../stage-param.service';

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
export class ListStageParamComponent implements OnInit {
  stageParamDetails: StageParamDetail[] = [];
  groupedStageParamDetails: GroupedStageParamDetail[] = [];

  constructor(
    private stageParamService: StageParamService,
    private modalService: NgbModal) { }

  ngOnInit() {
    this.loadStageParamDetails();
  }

  async loadStageParamDetails() {
    this.stageParamDetails = [];
    this.groupedStageParamDetails = [];
    try {
      const stageParams = await this.stageParamService.getStageParams().toPromise();
      for (const stageParam of stageParams._embedded.stageParams) {
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
        this.stageParamDetails.push(stageParamDetail);
      }

      // construire les groupes une fois la liste remplie
      this.buildGroupedStageParamDetails();

    } catch (error) {
      console.log(error);
      this.stageParamDetails = [];
      this.groupedStageParamDetails = [];
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
    const modalRef = this.modalService.open(NewStageParamComponent);
    try {
      const result: StageParam = await modalRef.result;
      console.log(result);
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
}
