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

  constructor(private pointService: PointService) { }

  ngOnInit() {
    this.points = this.pointService.getPoints();
  }

  recomputePoints() {
    this.points = this.pointService.recomputePoints();
  }
}
