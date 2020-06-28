import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { PerformanceRangePointParam } from '../models/performance-range-point-param';
import { TeamInfoService } from '../team-info.service';
import { StandardContext, SpelExpressionEvaluator } from 'spel2js';

@Component({
  selector: 'app-modify-performance-range-point-param',
  templateUrl: './modify-performance-range-point-param.component.html',
  styleUrls: ['./modify-performance-range-point-param.component.scss']
})
export class ModifyPerformanceRangePointParamComponent implements OnInit {
  @Input() range: PerformanceRangePointParam;
  rangeForm: FormGroup;
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
    public activeModal: NgbActiveModal,
    private formBuilder: FormBuilder,
    private teamInfoService: TeamInfoService) { }

  ngOnInit() {
    this.createForm();
    this.teamInfoService.getTeamInfos().subscribe((value) => {
      const teamInfos = value._embedded.teamInfoes;
      this.rangeForm.patchValue({ nbAllTeam: teamInfos.length, nbTeam: Math.trunc(teamInfos.length / 2) });
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
        value: this.rangeForm.value.value,
        nbAllTeam: this.rangeForm.value.nbAllTeam,
        nbTeam: this.rangeForm.value.nbTeam,
        toLong: (i: number) => Math.trunc(i)
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
    this.activeModal.close(currentRange);
  }
}
