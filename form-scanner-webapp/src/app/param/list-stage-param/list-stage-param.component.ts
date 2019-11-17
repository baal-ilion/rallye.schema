import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { StageParamService } from '../stage-param.service';

@Component({
  selector: 'app-list-stage-param',
  templateUrl: './list-stage-param.component.html',
  styleUrls: ['./list-stage-param.component.scss']
})
export class ListStageParamComponent implements OnInit {
  stageParams: Observable<any[]>;

  constructor(private stageParamService: StageParamService) { }

  ngOnInit() {
    this.stageParams = this.stageParamService.getStageParams();
  }
}
