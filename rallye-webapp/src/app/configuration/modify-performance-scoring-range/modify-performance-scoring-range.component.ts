import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { StandardContext, SpelExpressionEvaluator } from 'spel2js';
import { PerformanceScoringRange } from '../models/performance-scoring-range';
import { TeamService } from '../team.service';
import { PerformanceScoring, PerformanceValueFormat } from '../models/performance-scoring';

@Component({
  selector: 'app-modify-performance-scoring-range',
  templateUrl: './modify-performance-scoring-range.component.html',
  styleUrls: ['./modify-performance-scoring-range.component.scss']
})
export class ModifyPerformanceScoringRangeComponent implements OnInit {
  @Input() range: PerformanceScoringRange;
  @Input() performanceScoring: PerformanceScoring;
  readonly defaultFormat = PerformanceValueFormat.DECIMAL;
  rangeForm: UntypedFormGroup;
  result: number | null = null;
  simulationError = '';
  perfPointAllocationType = {
    VALUE: 'SCORE',
    BEGIN_UP_RANK: 'DATE',
    BEGIN_DOWN_RANK: 'DATE',
    END_UP_RANK: 'DATE',
    END_DOWN_RANK: 'DATE',
    PERF_UP_RANK: 'RANK',
    PERF_DOWN_RANK: 'RANK'
  };

  constructor(
    public dialogRef: MatDialogRef<ModifyPerformanceScoringRangeComponent>,
    private formBuilder: UntypedFormBuilder,
    private teamService: TeamService) { }

  ngOnInit() {
    this.createForm();
    this.rangeForm.valueChanges.subscribe(() => this.computeResult());
    this.teamService.getTeams().subscribe((value) => {
      const teams = value._embedded.teams;
      this.rangeForm.patchValue({ nbAllTeam: teams.length, nbTeam: Math.trunc(teams.length / 2) });
      this.computeResult();
    }, (error) => {
      console.log(error);
    });
  }

  private createForm() {
    const n: number = null;
    const begin = this.range.begin ?? 0;
    const end = this.range.end ?? (begin + 20);
    this.rangeForm = this.formBuilder.group({
      point: this.range.point,
      expression: this.range.expression,
      pointType: this.range.point || !this.range.expression ? 'point' : 'expression',
      value: (begin + end) / 2,
      nbAllTeam: n,
      nbTeam: n,
    });
  }

  computeResult() {
    const formValue = this.rangeForm.getRawValue();
    if (formValue.pointType !== 'expression' || !formValue.expression?.trim()) {
      this.result = null;
      this.simulationError = '';
      return;
    }
    try {
      const spelContext = StandardContext.create({}, {});
      const locals = {
        valeur: formValue.value,
        nbEqInscrites: formValue.nbAllTeam,
        nbEqParticipantes: formValue.nbTeam,
        arrondi: (i: number) => Math.trunc(i)
      };
      const compiledExpression = SpelExpressionEvaluator.compile(this.normalizeDecimalSeparators(formValue.expression));
      const evaluated = Number(compiledExpression.eval(spelContext, locals));
      if (!Number.isFinite(evaluated)) {
        throw new Error('Le résultat de la formule n’est pas un nombre.');
      }
      this.result = Math.trunc(evaluated);
      this.simulationError = '';
    } catch (error) {
      console.log(error);
      this.result = null;
      this.simulationError = 'La formule ne peut pas être calculée avec les valeurs saisies.';
    }
  }

  private normalizeDecimalSeparators(expression: string): string {
    return expression.replace(/(\d),(?=\d)/g, '$1.');
  }

  submitForm() {
    const currentRange = JSON.parse(JSON.stringify(this.range));
    if (this.rangeForm.value.pointType === 'point') {
      currentRange.point = this.rangeForm.value.point;
      currentRange.expression = null;
    } else {
      currentRange.point = null;
      currentRange.expression = this.rangeForm.value.expression;
    }
    this.dialogRef.close(currentRange);
  }
}
