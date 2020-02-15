import { Component, OnInit } from '@angular/core';
import { StageService } from '../stage.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-list-stage',
  templateUrl: './list-stage.component.html',
  styleUrls: ['./list-stage.component.scss']
})
export class ListStageComponent implements OnInit {
  stages = [];

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
