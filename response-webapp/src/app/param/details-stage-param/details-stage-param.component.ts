import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { StageParamService } from '../stage-param.service';

@Component({
  selector: 'app-details-stage-param',
  templateUrl: './details-stage-param.component.html',
  styleUrls: ['./details-stage-param.component.scss']
})
export class DetailsStageParamComponent implements OnInit {
  @Input() stageParam: any;

  nbQuestion = 0;
  nbPerformance = 0;
  nbResponceFile = 0;

  constructor(private stageParamService: StageParamService) { }

  ngOnInit() {
    this.nbQuestion = 0;
    this.nbPerformance = 0;
    this.nbResponceFile = 0;

    const questionKeys = Object.keys(this.stageParam.questionParams);
    for (const questionKey of questionKeys) {
      const questionParam = this.stageParam.questionParams[questionKey];
      if (questionParam.type === 'QUESTION') {
        this.nbQuestion += 1;
      } else if (questionParam.type === 'PERFORMANCE') {
        this.nbPerformance += 1;
      }
    }
    if (this.stageParam._links && this.stageParam._links.responseFileParams) {
       this.nbResponceFile = this.stageParam._links.responseFileParams.length;
    }

  }

 }
