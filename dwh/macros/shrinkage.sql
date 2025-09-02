{% macro shrink_rate(numer, denom, mu, k) -%}
  -- numer/denom shrunk to mu with strength k
  CASE
    WHEN {{ denom }} IS NULL OR {{ denom }} = 0 THEN {{ mu }}
    ELSE (({{ numer }}::numeric) + ({{ mu }}::numeric * {{ k }}::numeric))
         / (({{ denom }}::numeric) + {{ k }}::numeric)
  END
{%- endmacro %}