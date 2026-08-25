import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { StandardContext, SpelExpressionEvaluator } from 'spel2js';
import { PerformanceScoringRange } from '../models/performance-scoring-range';
import { TeamService } from '../team.service';

@Component({
  selector: 'app-modify-performance-scoring-range',
  templateUrl: './modify-performance-scoring-range.component.html',
  styleUrls: ['./modify-performance-scoring-range.component.scss']
})
export class ModifyPerformanceScoringRangeComponent implements OnInit {
  @Input() range: PerformanceScoringRange;
  rangeForm: UntypedFormGroup;
  result: number;
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
    this.rangeForm = this.formBuilder.group({
      point: this.range.point,
      expression: this.range.expression,
      pointType: this.range.point || !this.range.expression ? 'point' : 'expression',
      value: Math.trunc((this.range.begin ?? 0 + this.range.end ?? (this.range.begin + 20)) / 2),
      nbAllTeam: n,
      nbTeam: n,
    });
  }

  computeResult() {
    try {
      const spelContext = StandardContext.create({}, {});
      const locals = {
        valeur: this.rangeForm.value.value,
        nbEqInscrites: this.rangeForm.value.nbAllTeam,
        nbEqParticipantes: this.rangeForm.value.nbTeam,
        arrondi: (i: number) => Math.trunc(i)
      };
      const compiledExpression = SpelExpressionEvaluator.compile(this.rangeForm.value.expression);
      this.result = Math.trunc(compiledExpression.eval(spelContext, locals));
    } catch (error) {
      console.log(error);
      this.result = null;
    }
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
