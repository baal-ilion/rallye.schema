import { Component, OnInit, OnChanges, Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { Corners } from 'src/app/response-file/common/details-template/models/corners';
import { FormTemplate } from 'src/app/response-file/common/details-template/models/form-template';

@Component({
  selector: 'app-details-response-file',
  templateUrl: './details-response-file.component.html',
  styleUrls: ['./details-response-file.component.scss']
})
export class DetailsResponseFileComponent implements OnInit, OnChanges {
  @Input() fileUpload: any;
  @Input() dragable = true;
  @Output() endDragEvent = new EventEmitter<Corners>();

  template: FormTemplate;
  constructor() { }

  ngOnInit() {
    this.loadTemplate(this.fileUpload);
  }

  ngOnChanges(changes: SimpleChanges): void {
    for (const propName in changes) {
      if (propName === 'fileUpload') {
        console.log(propName);
        const change = changes[propName];
        this.loadTemplate(change.currentValue);
      } else {
        console.log(propName);
      }
    }
  }

  loadTemplate(fileUpload) {
    this.template = new FormTemplate();
    this.template.fileUrl = fileUpload._links.responseFile.href;
    this.template.square = fileUpload.filledForm.size;
    this.template.height = fileUpload.filledForm.height;
    this.template.width = fileUpload.filledForm.width;
    if (fileUpload.filledForm.parentTemplate) {
      this.template.initialHeight = fileUpload.filledForm.parentTemplate.height;
      this.template.initialWidth = fileUpload.filledForm.parentTemplate.width;
    }
    this.template.corners = fileUpload.filledForm.corners;

    const groups = fileUpload.filledForm.groups;
    const groupKeys = Object.keys(groups).sort();
    for (const group of groupKeys) {
      const fields = groups[group].fields;
      const fieldKeys = Object.keys(fields).sort();
      for (const field of fieldKeys) {
        const points = fields[field].points;
        const pointKeys = Object.keys(points);
        let resultValue = null;
        if (pointKeys.includes('O')) {
          resultValue = true;
        } else if (pointKeys.includes('N')) {
          resultValue = false;
        } else if (pointKeys.includes('Y')) {
          resultValue = true;
        }
        let commentTxt = field;
        if (resultValue === null) {
          commentTxt += ' : ' + pointKeys.join(', ');
        } else {
          commentTxt += resultValue ? ' : Ok' : ' : Ko';
        }

        for (const point of pointKeys) {
          if (points[point]) {
            this.template.points.push({
              point: points[point],
              valid: resultValue,
              comment: commentTxt
            });
          }
        }
      }
    }

  }

  endDrag(event: Corners) {
    this.endDragEvent.emit(event);
  }
}
