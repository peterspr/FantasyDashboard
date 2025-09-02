{% macro ewa(expr, order_cols, partition_cols, alpha=0.5) -%}
  -- Exponentially weighted average, fallback to rolling 4-week average
  AVG({{ expr }}) OVER (PARTITION BY {{ partition_cols }} ORDER BY {{ order_cols }}
    ROWS BETWEEN 3 PRECEDING AND CURRENT ROW)
{%- endmacro %}