import { Component, OnInit } from '@angular/core';
import {
  PrizeDistributionResult,
  PrizeDistributionService,
  PrizeAssignment
} from '../../services/prize-distribution.service';

@Component({
  selector: 'app-prize-distribution',
  templateUrl: './prize-distribution.component.html',
  styleUrls: ['./prize-distribution.component.scss']
})
export class PrizeDistributionComponent implements OnInit {

  loading = false;
  error: string | null = null;

  prizes: PrizeAssignment[] = [];

  constructor(private prizeService: PrizeDistributionService) { }

  ngOnInit(): void {
    this.loadPrizes();
  }

  private loadPrizes(): void {
    this.loading = true;
    this.error = null;
    this.prizes = [];

    this.prizeService.getPrizes().subscribe({
      next: (result: PrizeDistributionResult) => {
        const all: PrizeAssignment[] = [];

        if (result.generalPrize) {
          all.push(result.generalPrize);
        }

        if (result.groupPrizes) {
          all.push(...result.groupPrizes);
        }

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
