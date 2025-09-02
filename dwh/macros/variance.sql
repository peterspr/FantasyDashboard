{% macro normal_ci(mean, var, z=1.28155) -%}
  -- Normal confidence interval (default ~p10/p90 with z=1.28155)
  ({{ mean }} - ({{ z }} * SQRT(GREATEST({{ var }}, 0)))) AS low,
  ({{ mean }} + ({{ z }} * SQRT(GREATEST({{ var }}, 0)))) AS high
{%- endmacro %}