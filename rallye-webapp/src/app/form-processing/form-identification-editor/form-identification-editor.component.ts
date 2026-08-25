import { Component, OnInit, Input } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-form-identification-editor',
  templateUrl: './form-identification-editor.component.html',
  styleUrls: ['./form-identification-editor.component.scss']
})
export class FormIdentificationEditorComponent implements OnInit {

  @Input() fileUpload: any;
  myForm: UntypedFormGroup;

  constructor(public dialogRef: MatDialogRef<FormIdentificationEditorComponent>,
              private formBuilder: UntypedFormBuilder) { }

  ngOnInit() {
    this.createForm();
  }

  private createForm() {
    this.myForm = this.formBuilder.group({
      challenge: this.fileUpload.challenge,
      page: this.fileUpload.page,
      team: this.fileUpload.team
    });
  }

  submitForm() {
    this.dialogRef.close(this.myForm.value);
  }
}
