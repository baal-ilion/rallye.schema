import { Component, OnInit } from '@angular/core';
import { StageResult } from '../models/stage-result';
import { StageService } from '../stage.service';

@Component({
  selector: 'app-list-stage',
  templateUrl: './list-stage.component.html',
  styleUrls: ['./list-stage.component.scss']
})
export class ListStageComponent implements OnInit {
  stages: StageResult[] = [];

  constructor(private stageService: StageService) { }

  ngOnInit() {
    this.stageService.getStages().subscribe((data) => {
      if (data._embedded) {
        this.stages = data._embedded.stageResults;
      } else {
        this.stages = [];
      }
    }, (error) => {
      this.stages = [];
    });
  }
}
