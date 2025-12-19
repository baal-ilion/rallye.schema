import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { Ranking } from '../models/ranking';

@Component({
  selector: 'app-ranking',
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.scss']
})
export class RankingComponent implements OnInit {
  @Input() rankingTitle: string;
  @Input() teamRanking: Ranking[];
  @Input() teamInfos: { [team: number]: any };
  @Input() viewPoints = true;
  @Input() performanceLabel?: string | null;
  @Input() performanceValues?: { [team: number]: number | null } | null;
  @ViewChild('ranking_table') rankingTable: ElementRef;

  constructor() { }

  ngOnInit(): void {
  }
}
