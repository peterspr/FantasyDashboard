{% macro j_get_text(obj, key, default='') -%}
  COALESCE( ({{obj}} ->> '{{ key }}')::text, 
    {%- if default.startswith("'") and default.endswith("'") -%}
      {{ default }}
    {%- else -%}
      '{{ default }}'
    {%- endif -%} )
{%- endmacro %}

{% macro j_get_num(obj, key, default='0') -%}
  COALESCE( NULLIF({{obj}} ->> '{{ key }}','')::numeric, {{ default }}::numeric )
{%- endmacro %}

{% macro j_get_int(obj, key, default='0') -%}
  COALESCE( NULLIF({{obj}} ->> '{{ key }}','')::int, {{ default }}::int )
{%- endmacro %}