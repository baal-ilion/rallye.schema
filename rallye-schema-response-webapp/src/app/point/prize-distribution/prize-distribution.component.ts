import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  PrizeDistributionResult,
  PrizeDistributionService,
  PrizeAssignment
} from '../../services/prize-distribution.service';
import { RankingUpdateService } from '../../services/ranking-update.service';
import { TeamInfoUpdateService } from '../../services/team-info-update.service';
import { merge, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-prize-distribution',
  templateUrl: './prize-distribution.component.html',
  styleUrls: ['./prize-distribution.component.scss']
})
export class PrizeDistributionComponent implements OnInit, OnDestroy {

  loading = false;
  error: string | null = null;
  prizes: PrizeAssignment[] = [];
  private readonly destroy$ = new Subject<void>();

  constructor(
    private prizeService: PrizeDistributionService,
    private rankingUpdateService: RankingUpdateService,
    private teamInfoUpdateService: TeamInfoUpdateService
  ) { }

  ngOnInit(): void {
    this.loadPrizes();

    merge(this.rankingUpdateService.updates$, this.teamInfoUpdateService.updates$)
      .pipe(
        debounceTime(150),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.loadPrizes(true));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
          all.push(...[...result.groupPrizes].sort((left, right) => {
            const groupComparison = (left.groupName ?? '').localeCompare(
              right.groupName ?? '',
              'fr',
              { sensitivity: 'base', numeric: true }
            );
            if (groupComparison !== 0) {
              return groupComparison;
            }
            return left.rank - right.rank || left.team - right.team;
          }));
        }

        this.error = null;
        if (!this.samePrizes(this.prizes, all)) {
          this.prizes = all;
        }
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'Erreur lors du chargement de la distribution des lots.';
        this.loading = false;
      }
    });
  }

  trackPrize(_index: number, prize: PrizeAssignment): string {
    return `${prize.type}:${prize.groupId ?? 'general'}:${prize.team}`;
  }

  private samePrizes(left: PrizeAssignment[], right: PrizeAssignment[]): boolean {
    return left.length === right.length && left.every((prize, index) => {
      const other = right[index];
      return prize.type === other.type &&
        prize.groupId === other.groupId &&
        prize.groupName === other.groupName &&
        prize.team === other.team &&
        prize.teamName === other.teamName &&
        prize.score === other.score &&
        prize.rank === other.rank;
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
