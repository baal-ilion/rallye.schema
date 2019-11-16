import { Component, OnInit, Input } from '@angular/core';
import { UploadFileService } from 'src/app/upload/upload-file.service';
import { Observable, of } from 'rxjs';
import { FormGroup, FormBuilder, FormArray } from '@angular/forms';
import { stringify } from 'querystring';
import { StageService } from '../stage.service';

@Component({
  selector: 'app-details-stage',
  templateUrl: './details-stage.component.html',
  styleUrls: ['./details-stage.component.scss']
})
export class DetailsStageComponent implements OnInit {

  @Input() stage: any;

  form: FormGroup;
  files: Observable<any[]>;

  constructor(private uploadFileService: UploadFileService, private formBuilder: FormBuilder, private stageService: StageService) { }
  // convenience getters for easy access to form fields
  get f() { return this.form.controls; }
  get results() { return this.f.results as FormArray; }

  ngOnInit() {
    this.files = this.uploadFileService.findByStageAndTeam(this.stage.stage, this.stage.team);
    this.form = this.formBuilder.group({
      results: this.formBuilder.array([]),
      checked: this.stage.checked
    });
    for (const result of this.stage.results) {
      this.results.push(this.formBuilder.group({
        name: result.name,
        resultValue: result.resultValue
      }));
    }
  }

  onSubmit() {
    const modifiedRresults = [];
    this.form.value.results.forEach((item, index) => {
      if (item.resultValue !== this.stage.results[index].resultValue) {
        modifiedRresults.push(item);
      }
    });
    this.stageService.updateStage({
      id: this.stage.id, team: this.stage.team, stage: this.stage.stage, checked: this.form.value.checked, results: modifiedRresults
    });
  }
}
