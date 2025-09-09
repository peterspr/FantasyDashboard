{% macro rolling_avg(expr, order_cols, partition_cols, window=4) -%}
  AVG({{expr}}) OVER (PARTITION BY {{ partition_cols }} ORDER BY {{ order_cols }}
                       ROWS BETWEEN {{ window }} PRECEDING AND 1 PRECEDING)
{%- endmacro %}