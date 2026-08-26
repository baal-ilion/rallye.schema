import { Pipe, PipeTransform } from '@angular/core';
import { PerformanceScoring } from '../../configuration/models/performance-scoring';
import { PerformanceValueFormatService } from './performance-value-format.service';

@Pipe({ name: 'performanceValue' })
export class PerformanceValuePipe implements PipeTransform {
  constructor(private formatter: PerformanceValueFormatService) {}
  transform(value: number | null | undefined, definition?: Partial<PerformanceScoring> | null): string {
    return this.formatter.format(value, definition);
  }
}
