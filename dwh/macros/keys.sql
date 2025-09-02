{% macro coalesce_key(expr) -%}
  COALESCE({{ expr }}, '')
{%- endmacro %}

{% macro composite_pk(cols) -%}
  -- returns comma-joined COALESCE'd cols for use in unique_key configs
  {{ return( cols | map('string') | join(', ') ) }}
{%- endmacro %}