import { Component, OnInit, Input, ViewChild, ElementRef } from '@angular/core';
import { Ranking } from '../models/ranking';
import { PerformanceScoring } from '../../configuration/models/performance-scoring';

@Component({
  selector: 'app-ranking',
  templateUrl: './ranking.component.html',
  styleUrls: ['./ranking.component.scss']
})
export class RankingComponent implements OnInit {
  @Input() rankingTitle: string;
  @Input() teamRanking: Ranking[];
  @Input() teams: { [team: number]: any };
  @Input() viewPoints = false;
  @Input() performanceLabel?: string | null;
  @Input() performanceValues?: { [team: number]: number | null } | null;
  @Input() performanceDefinition?: PerformanceScoring | null;
  @Input() reservePerformanceColumn = false;
  @Input() presentationMode = false;
  @Input() synchronizeColumns = true;
  @ViewChild('ranking_table') rankingTable: ElementRef;

  constructor() { }

  ngOnInit(): void {
  }

  trackTeam(_index: number, ranking: Ranking): number {
    return ranking.team;
  }
}
