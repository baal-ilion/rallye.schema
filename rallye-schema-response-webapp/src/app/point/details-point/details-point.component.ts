import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-details-point',
  templateUrl: './details-point.component.html',
  styleUrls: ['./details-point.component.scss']
})
export class DetailsPointComponent implements OnInit {

  @Input() point: any;
  readonly stageOrder = (a: { key: string }, b: { key: string }) => Number(a.key) - Number(b.key);

  constructor() { }

  ngOnInit() {
  }

}
