import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { ResponseFileParam } from '../models/response-file-param';

@Component({
  selector: 'app-modify-response-file-param',
  templateUrl: './modify-response-file-param.component.html',
  styleUrls: ['./modify-response-file-param.component.scss']
})
export class ModifyResponseFileParamComponent implements OnInit {

  @Input() param: ResponseFileParam;
  @ViewChild('labelImportText')
  labelImportText: ElementRef;
  @ViewChild('labelImportModelText')
  labelImportModelText: ElementRef;

  templateFile: File;
  responseFileModel: File;
  myForm: UntypedFormGroup;
  detailsParam: ResponseFileParam;
  modelUrl: string;

  constructor(public dialogRef: MatDialogRef<ModifyResponseFileParamComponent>, private formBuilder: UntypedFormBuilder) { }

  ngOnInit() {
    this.detailsParam = JSON.parse(JSON.stringify(this.param));
    if (this.param._links) {
      const href = this.param._links.responseFileModel.href;
      try {
        const url = new URL(href, window.location.origin);
        this.modelUrl = `/api${url.pathname}${url.search}`;
      } catch {
        this.modelUrl = href;
      }
    } else {
      this.modelUrl = null;
    }
    this.createForm();
  }

  private createForm() {
    this.myForm = this.formBuilder.group({
      stage: this.param.stage,
      page: this.param.page,
      template: this.param.template,
      templateFile: '',
      responseFileModel: ''
    });
  }

  submitForm() {
    const formData = new FormData();
    const data = {
      id: this.param.id,
      stage: this.myForm.value.stage,
      page: this.myForm.value.page,
      template: this.myForm.value.template
    };
    formData.append('responseFileParam', JSON.stringify(data));
    formData.append('responseFileModel', this.responseFileModel);
    this.dialogRef.close(formData);
  }

  selectFile(files: FileList) {
    if (files.length > 0) {
      const names = Array.from(files).map(f => f.name).join(', ');
      this.labelImportText.nativeElement.innerText = names;
      this.templateFile = files.item(0);
      const myReader = new FileReader();
      myReader.onloadend = (e) => {
        this.myForm.patchValue({ template: myReader.result });
        this.detailsParam.template = myReader.result.toString();
        this.detailsParam = Object.assign({}, this.detailsParam);
      };
      myReader.readAsText(this.templateFile);
    }
  }

  selectFileModel(files: FileList) {
    if (files.length > 0) {
      const names = Array.from(files).map(f => f.name).join(', ');
      this.labelImportModelText.nativeElement.innerText = names;
      this.responseFileModel = files.item(0);
      const reader = new FileReader();

      reader.onload = (e) => {
        this.modelUrl = reader.result.toString();
        const img = new Image();
        img.onload = () => {
          this.detailsParam.width = img.width;
          this.detailsParam.height = img.height;
          console.log(this.detailsParam.width);
          console.log(this.detailsParam.height);
          this.detailsParam = Object.assign({}, this.detailsParam);
        };
        img.src = this.modelUrl;
        console.log(this.modelUrl);
        this.detailsParam = Object.assign({}, this.detailsParam);
      };
      reader.readAsDataURL(this.responseFileModel);
    }
  }
}
