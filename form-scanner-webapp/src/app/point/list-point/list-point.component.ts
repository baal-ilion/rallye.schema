import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { PointService } from '../point.service';

@Component({
  selector: 'app-list-point',
  templateUrl: './list-point.component.html',
  styleUrls: ['./list-point.component.scss']
})
export class ListPointComponent implements OnInit {
  points: Observable<any[]>;
  showPoint = false;

  constructor(private pointService: PointService) { }

  ngOnInit() {
  }

  showPoints(enable: boolean) {
    this.showPoint = enable;

    if (enable) {
      this.points = this.pointService.getPoints();
    }
  }

  recomputePoints() {
    this.points = this.pointService.recomputePoints();
  }
}
