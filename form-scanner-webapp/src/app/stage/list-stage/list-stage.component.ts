import { Component, OnInit } from '@angular/core';
import { StageService } from '../stage.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-list-stage',
  templateUrl: './list-stage.component.html',
  styleUrls: ['./list-stage.component.scss']
})
export class ListStageComponent implements OnInit {
  stages: Observable<any[]>;

  constructor(private stageService: StageService) { }

  ngOnInit() {
    this.stages = this.stageService.getStages();
  }
}
