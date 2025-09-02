{% macro ewa(expr, order_cols, partition_cols, alpha=0.5, window=4) -%}
  -- Exponentially weighted average, implemented as rolling average for now
  -- Future enhancement: true EWA with decay parameter
  {{ rolling_avg(expr, order_cols, partition_cols, window) }}
{%- endmacro %}