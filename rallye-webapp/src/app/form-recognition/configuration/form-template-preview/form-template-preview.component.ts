import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Corners } from '../../common/details-template/models/corners';
import { FormTemplate } from '../../common/details-template/models/form-template';
import { FormRecognitionConfiguration } from '../models/form-recognition-configuration';

@Component({
  selector: 'app-form-template-preview',
  templateUrl: './form-template-preview.component.html',
  styleUrls: ['./form-template-preview.component.scss']
})
export class FormTemplatePreviewComponent implements OnInit, OnChanges {
  @Input() configuration!: FormRecognitionConfiguration;
  @Input() modelUrl = '';
  @Output() endDragEvent = new EventEmitter<Corners>();

  template = new FormTemplate();
  constructor() { }

  ngOnInit() {
    this.loadTemplate(this.configuration, this.modelUrl);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes.configuration || changes.modelUrl) && this.configuration) {
      this.loadTemplate(this.configuration, this.modelUrl);
    }
  }

  loadTemplate(configuration: FormRecognitionConfiguration, modelUrl: string) {
    this.template = new FormTemplate();
    this.template.height = configuration.height;
    this.template.width = configuration.width;
    if (modelUrl) {
      let path = modelUrl;
      try {
        const url = new URL(modelUrl, window.location.origin);
        path = `${url.pathname}${url.search}`;
      } catch {
        // modelUrl peut déjà être relatif
      }
      this.template.fileUrl = `/api${path}`;
    }
    //this.template.fileAlt = this.alt;
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(configuration.template, 'text/xml');
    this.template.corners = new Corners();
    const corners = xmlDoc.getElementsByTagName('corner');
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < corners.length; i++) {
      const position = corners[i].getAttribute('position');
      const point = corners[i].getElementsByTagName('point')[0];
      if (!point) {
        continue;
      }
      const coordinates = {
        x: Number(point.getAttribute('x') ?? 0),
        y: Number(point.getAttribute('y') ?? 0)
      };
      if (position === 'TOP_RIGHT') {
        this.template.corners.TOP_RIGHT = coordinates;
      } else if (position === 'BOTTOM_RIGHT') {
        this.template.corners.BOTTOM_RIGHT = coordinates;
      } else if (position === 'BOTTOM_LEFT') {
        this.template.corners.BOTTOM_LEFT = coordinates;
      } else if (position === 'TOP_LEFT') {
        this.template.corners.TOP_LEFT = coordinates;
      }
    }
    const fields = xmlDoc.getElementsByTagName('fields')[0];
    this.template.square = Number(fields?.getAttribute('size') ?? 0);
    const values = xmlDoc.getElementsByTagName('value');
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < values.length; i++) {
      const question = values[i].closest('question')?.getAttribute('question') ?? '';
      const point = values[i].getElementsByTagName('point')[0];
      if (!point) {
        continue;
      }
      this.template.points.push({
        point: {
          x: Number(point.getAttribute('x') ?? 0),
          y: Number(point.getAttribute('y') ?? 0)
        },
        valid: null,
        comment: question + ' : ' + (values[i].getAttribute('response') ?? '')
      });
    }
  }

  endDrag(event: Corners) {
    this.endDragEvent.emit(event);
  }
}
