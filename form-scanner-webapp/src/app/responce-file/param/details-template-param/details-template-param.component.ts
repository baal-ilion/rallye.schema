import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { Corners } from '../../common/details-template/models/corners';
import { FormTemplate } from '../../common/details-template/models/form-template';

@Component({
  selector: 'app-details-template-param',
  templateUrl: './details-template-param.component.html',
  styleUrls: ['./details-template-param.component.scss']
})
export class DetailsTemplateParamComponent implements OnInit, OnChanges {
  @Input() param: any;
  @Output() endDragEvent = new EventEmitter<Corners>();

  template: FormTemplate;
  constructor() { }

  ngOnInit() {
    this.loadTemplate(this.param);
  }

  ngOnChanges(changes: SimpleChanges): void {
    for (const propName in changes) {
      if (propName === 'param') {
        const change = changes[propName];
        this.loadTemplate(change.currentValue);
        break;
      }
    }
  }

  loadTemplate(param) {
    this.template = new FormTemplate();
    this.template.height = param.height;
    this.template.width = param.width;
    this.template.fileUrl = param.img;
    //this.template.fileAlt = this.alt;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(param.template, 'text/xml');
    this.template.corners = new Corners();
    const corners = xmlDoc.getElementsByTagName('corner');
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < corners.length; i++) {
      const position = corners[i].getAttribute('position');
      const point = corners[i].getElementsByTagName('point')[0];
      if (position === 'TOP_RIGHT') {
        this.template.corners.TOP_RIGHT = { x: +point.getAttribute('x'), y: +point.getAttribute('y') };
      } else if (position === 'BOTTOM_RIGHT') {
        this.template.corners.BOTTOM_RIGHT = { x: +point.getAttribute('x'), y: +point.getAttribute('y') };
      } else if (position === 'BOTTOM_LEFT') {
        this.template.corners.BOTTOM_LEFT = { x: +point.getAttribute('x'), y: +point.getAttribute('y') };
      } else if (position === 'TOP_LEFT') {
        this.template.corners.TOP_LEFT = { x: +point.getAttribute('x'), y: +point.getAttribute('y') };
      }
    }
    const fields = xmlDoc.getElementsByTagName('fields')[0];
    this.template.square = +fields.getAttribute('size');
    const values = xmlDoc.getElementsByTagName('value');
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < values.length; i++) {
      const question = values[i].parentElement.parentElement.getAttribute('question');
      const point = values[i].getElementsByTagName('point')[0];
      this.template.points.push({
        point: {
          x: +point.getAttribute('x'),
          y: +point.getAttribute('y')
        },
        valid: null,
        comment: question + ' : ' + values[i].getAttribute('response')
      });
    }
  }

  endDrag(event: Corners) {
    this.endDragEvent.emit(event);
  }
}
