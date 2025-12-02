import { Component, OnInit, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { UntypedFormGroup, UntypedFormBuilder } from '@angular/forms';

@Component({
  selector: 'app-modify-upload',
  templateUrl: './modify-upload.component.html',
  styleUrls: ['./modify-upload.component.scss']
})
export class ModifyUploadComponent implements OnInit {

  @Input() fileUpload: any;
  myForm: UntypedFormGroup;

  constructor(public activeModal: NgbActiveModal,
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
    this.activeModal.close(this.myForm.value);
  }
}
