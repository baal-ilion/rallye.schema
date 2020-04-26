import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HalLink } from 'src/app/models/hal-link';
import { StageParam } from '../models/stage-param';
import { NewStageParamComponent } from '../new-stage-param/new-stage-param.component';
import { StageParamService } from '../stage-param.service';

interface StageParamDetail {
  param: StageParam;
  nbQuestion: number;
  nbPerformance: number;
  nbResponceFile: number;
}

@Component({
  selector: 'app-list-stage-param',
  templateUrl: './list-stage-param.component.html',
  styleUrls: ['./list-stage-param.component.scss']
})
export class ListStageParamComponent implements OnInit {
  stageParamDetails: StageParamDetail[] = [];

  constructor(
    private stageParamService: StageParamService,
    private modalService: NgbModal) { }

  ngOnInit() {
    this.loadStageParamDetails();
  }

  async loadStageParamDetails() {
    this.stageParamDetails = [];
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
    } catch (error) {
      console.log(error);
      this.stageParamDetails = [];
    }
  }

  async addStageParam() {
    const modalRef = this.modalService.open(NewStageParamComponent);
    try {
      const result: StageParam = await modalRef.result;
      console.log(result);
      try {
        const created = await this.stageParamService.addStageParam(result).toPromise();
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
