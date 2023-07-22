"use strict";

import axios_static, { AxiosInstance, AxiosStatic } from "axios";
import { useRequestMetric, useResponseMetric } from "axios-metric";
import { LogLevel, Logger } from "logger";

export type AxiosMetricLoggerOptions = {
  req_metric_enabled: boolean;
  req_metric_level: LogLevel;
  res_metric_enabled: boolean;
  res_metric_level: LogLevel;
  err_metric_enabled: boolean;
  err_metric_level: LogLevel;

  /**
   * This option remove the request object from the AxiosError.
   * ```ts
   * delete error.request
   * delete error.response.request
   * ```
   */
  shortend_axios_error: boolean;
};

declare module "axios-metric" {
  export interface Metadata {
    reference_id?: string;
    log_options?: Partial<AxiosMetricLoggerOptions>;
  }
};

export function use(
  axios: AxiosStatic | AxiosInstance,
  logger: Logger,
  options: Partial<AxiosMetricLoggerOptions>,
) {
  const g_req_metric_enabled = options.req_metric_enabled ?? true;
  const g_res_metric_enabled = options.res_metric_enabled ?? true;
  const g_err_metric_enabled = options.err_metric_enabled ?? true;
  const g_req_metric_level = options.req_metric_level ?? "info";
  const g_res_metric_level = options.res_metric_level ?? "info";
  const g_err_metric_level = options.res_metric_level ?? "error";
  const g_shortend_axios_error = options.shortend_axios_error ?? true;

  if (g_req_metric_enabled) {
    useRequestMetric(axios, (metric, config) => {
      const metadata = config.metadata;
      const reference_id = metadata.reference_id;
      const log_options = config.metadata.log_options;
      const enabled = log_options?.req_metric_enabled ?? g_req_metric_enabled;
      if (enabled) {
        const log_level = log_options?.req_metric_level ?? g_req_metric_level;
        logger.log(log_level, {
          reference_id,
          message: "Axios request metric.",
          type: typeof metric,
          meta: metric,
        });
      }
    });
  }

  if (g_res_metric_enabled) {
    useResponseMetric(
      axios,
      function(metric, res) {
        const metadata = res.config.metadata;
        const reference_id = metadata.reference_id;
        const log_options = metadata.log_options;
        const enabled = log_options?.res_metric_enabled ?? g_res_metric_enabled;
        if (enabled) {
          const log_level = log_options?.res_metric_level ?? g_res_metric_level;
          logger.log(log_level, {
            reference_id,
            message: "Axios response metric.",
            type: typeof metric,
            meta: metric,
          });
        }
      },
      g_err_metric_enabled
        ? function(metric, err) {
          let reference_id: string | undefined = undefined;
          let log_options: Partial<AxiosMetricLoggerOptions> | undefined = undefined;
          if (axios_static.isAxiosError(err)) {
            reference_id = err.config?.metadata.reference_id;
            log_options = err.config?.metadata?.log_options;
            const shortend_axios_error = log_options?.shortend_axios_error ?? g_shortend_axios_error;
            if (shortend_axios_error) {
              delete err.request;
              delete err.response?.request;
            }
          }
          const enabled = log_options?.err_metric_enabled ?? g_err_metric_enabled;
          if (enabled) {
            const log_level = log_options?.err_metric_level ?? g_err_metric_level;
            logger.log(log_level, {
              reference_id,
              message: "Axios error metric.",
              type: typeof metric,
              meta: metric,
            });
          }
        }
        : null
    );
  }
};
