import { Component, OnDestroy, OnInit } from '@angular/core';
import { merge, of, Subject } from 'rxjs';
import { auditTime, catchError, finalize, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';
import { PointService } from '../point.service';
import { RankingUpdateService } from '../../services/ranking-update.service';

@Component({
  selector: 'app-list-point',
  templateUrl: './list-point.component.html',
  styleUrls: ['./list-point.component.scss']
})
export class ListPointComponent implements OnInit, OnDestroy {
  points: any[] = [];
  loading = false;
  error: string | null = null;
  readonly stageOrder = (a: { key: string }, b: { key: string }) => Number(a.key) - Number(b.key);

  private refresh$ = new Subject<'recompute' | 'auto'>();
  private destroy$ = new Subject<void>();

  constructor(
    private pointService: PointService,
    private rankingUpdateService: RankingUpdateService
  ) { }

  ngOnInit() {
    merge(this.refresh$, this.rankingUpdateService.updates$)
      .pipe(
        startWith('__initial__' as const),
        auditTime(150),
        switchMap((trigger) => {
          const isInitial = trigger === '__initial__';
          const isManualRecompute = trigger === 'recompute';

          if (isInitial || isManualRecompute) {
            this.loading = true;
            this.error = null;
          }

          const loader$ = isInitial
            ? this.pointService.getPoints()
            : this.pointService.recomputePoints();

          return loader$.pipe(
            tap((points) => {
              const sorted = (points || []).sort((a: any, b: any) => (a.team || 0) - (b.team || 0));
              this.points = sorted;
              this.error = null;
            }),
            catchError(err => {
              console.error(err);
              this.error = 'Erreur lors du chargement des points.';
              return of([]);
            }),
            finalize(() => {
              if (isInitial || isManualRecompute) {
                this.loading = false;
              }
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  recomputePoints() {
    this.refresh$.next('recompute');
  }
}
