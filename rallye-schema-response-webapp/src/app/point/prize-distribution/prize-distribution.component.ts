import { Component, OnInit } from '@angular/core';
import {
  PrizeDistributionResult,
  PrizeDistributionService,
  PrizeAssignment
} from '../../services/prize-distribution.service';
import { RankingUpdateService } from '../../services/ranking-update.service';
import { TeamInfoUpdateService } from '../../services/team-info-update.service';
import { merge } from 'rxjs';

@Component({
  selector: 'app-prize-distribution',
  templateUrl: './prize-distribution.component.html',
  styleUrls: ['./prize-distribution.component.scss']
})
export class PrizeDistributionComponent implements OnInit {

  loading = false;
  error: string | null = null;
  prizes: PrizeAssignment[] = [];

  constructor(
    private prizeService: PrizeDistributionService,
    private rankingUpdateService: RankingUpdateService,
    private teamInfoUpdateService: TeamInfoUpdateService
  ) { }

  ngOnInit(): void {
    this.loadPrizes();

    merge(this.rankingUpdateService.updates$, this.teamInfoUpdateService.updates$)
      .subscribe(() => this.loadPrizes(true));
  }

  private loadPrizes(silentRefresh = false): void {
    if (!silentRefresh) {
      this.loading = true;
      this.error = null;
      this.prizes = [];
    }

    this.prizeService.getPrizes().subscribe({
      next: (result: PrizeDistributionResult) => {
        const all: PrizeAssignment[] = [];

        if (result.generalPrize) {
          all.push(result.generalPrize);
        }

        if (result.groupPrizes) {
          all.push(...result.groupPrizes);
        }

        this.error = null;
        this.prizes = all;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Erreur lors du chargement de la distribution des lots.';
        this.loading = false;
      }
    });
  }

  getPrizeTypeLabel(prize: PrizeAssignment): string {
    if (prize.type === 'GENERAL') {
      return 'Classement général';
    }
    return 'Groupe d\'épreuves';
  }

  getGroupLabel(prize: PrizeAssignment): string {
    if (prize.type === 'GENERAL') {
      return 'Général';
    }
    return prize.groupName || '(groupe inconnu)';
  }
}
