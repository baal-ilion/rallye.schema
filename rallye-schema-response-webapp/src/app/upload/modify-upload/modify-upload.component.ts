import { Component, OnInit, Input } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-modify-upload',
  templateUrl: './modify-upload.component.html',
  styleUrls: ['./modify-upload.component.scss']
})
export class ModifyUploadComponent implements OnInit {

  @Input() fileUpload: any;
  myForm: UntypedFormGroup;

  constructor(public dialogRef: MatDialogRef<ModifyUploadComponent>,
              private formBuilder: UntypedFormBuilder) { }

  ngOnInit() {
    this.createForm();
  }

  private createForm() {
    this.myForm = this.formBuilder.group({
      stage: this.fileUpload.stage,
      page: this.fileUpload.page,
      team: this.fileUpload.team
    });
  }

  submitForm() {
    this.dialogRef.close(this.myForm.value);
  }
}
