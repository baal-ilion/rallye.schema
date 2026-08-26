import { Injectable } from '@angular/core';
import { PerformanceScoring, PerformanceValueFormat } from '../../configuration/models/performance-scoring';

@Injectable({ providedIn: 'root' })
export class PerformanceValueFormatService {
  format(value: number | null | undefined, definition?: Partial<PerformanceScoring> | null): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '-';
    const format = definition?.valueFormat || PerformanceValueFormat.DECIMAL;
    let displayed: string;
    switch (format) {
      case PerformanceValueFormat.INTEGER:
        displayed = Math.round(value).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
        break;
      case PerformanceValueFormat.DURATION_MINUTES_SECONDS:
        displayed = this.duration(value, false, true);
        break;
      case PerformanceValueFormat.DURATION_HOURS_MINUTES:
        displayed = this.duration(value, true, false);
        break;
      case PerformanceValueFormat.DURATION_HOURS_MINUTES_SECONDS:
        displayed = this.duration(value, true, true);
        break;
      case PerformanceValueFormat.ANGLE_DEGREES_MINUTES:
        displayed = this.angle(value, false);
        break;
      case PerformanceValueFormat.ANGLE_DEGREES_MINUTES_SECONDS:
        displayed = this.angle(value, true);
        break;
      default:
        displayed = value.toLocaleString('fr-FR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: Math.max(0, Math.min(6, definition?.decimalPlaces ?? 2))
        });
    }
    return definition?.unit?.trim() ? `${displayed} ${definition.unit.trim()}` : displayed;
  }

  private duration(totalSeconds: number, withHours: boolean, withSeconds: boolean): string {
    const total = Math.max(0, Math.round(totalSeconds));
    const hours = Math.floor(total / 3600);
    const minutes = withHours ? Math.floor(total % 3600 / 60) : Math.floor(total / 60);
    const seconds = total % 60;
    const parts: string[] = [];
    if (withHours) parts.push(`${hours} h`);
    parts.push(`${minutes.toString().padStart(withHours ? 2 : 1, '0')}′`);
    if (withSeconds) parts.push(`${seconds.toString().padStart(2, '0')}″`);
    return parts.join(' ');
  }

  private angle(decimalDegrees: number, withSeconds: boolean): string {
    const sign = decimalDegrees < 0 ? '-' : '';
    const absolute = Math.abs(decimalDegrees);
    const degrees = Math.floor(absolute);
    const minutesDecimal = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesDecimal);
    const seconds = Math.round((minutesDecimal - minutes) * 60);
    return `${sign}${degrees}° ${minutes.toString().padStart(2, '0')}′${withSeconds ? ` ${seconds.toString().padStart(2, '0')}″` : ''}`;
  }
}
