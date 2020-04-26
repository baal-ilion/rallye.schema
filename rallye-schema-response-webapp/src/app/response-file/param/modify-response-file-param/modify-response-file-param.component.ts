import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ResponseFileParam } from '../models/response-file-param';

@Component({
  selector: 'app-modify-response-file-param',
  templateUrl: './modify-response-file-param.component.html',
  styleUrls: ['./modify-response-file-param.component.scss']
})
export class ModifyResponseFileParamComponent implements OnInit {

  @Input() param: ResponseFileParam;
  @ViewChild('labelImport')
  labelImport: ElementRef;
  @ViewChild('labelImportModel')
  labelImportModel: ElementRef;

  templateFile: File;
  responseFileModel: File;
  myForm: FormGroup;
  detailsParam: ResponseFileParam;
  modelUrl: string;

  constructor(public activeModal: NgbActiveModal, private formBuilder: FormBuilder) { }

  ngOnInit() {
    this.detailsParam = JSON.parse(JSON.stringify(this.param));
    if (this.param._links) {
      this.modelUrl = this.param._links.responseFileModel.href;
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
    this.activeModal.close(formData);
  }

  selectFile(files: FileList) {
    if (files.length > 0) {
      this.labelImport.nativeElement.innerText = Array.from(files)
        .map(f => f.name)
        .join(', ');
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
      this.labelImportModel.nativeElement.innerText = Array.from(files)
        .map(f => f.name)
        .join(', ');
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
