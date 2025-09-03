{% macro score_points(scoring_alias, rec, rec_yds, rec_tds, rush_yds, rush_tds, pass_yds, pass_tds, ints, fumbles) -%}
  {%- set prefix = scoring_alias + '.' if scoring_alias else '' -%}
  -- Calculate fantasy points using scoring weights
  (COALESCE({{ rec }}, 0) * {{ prefix }}reception)
  + (COALESCE({{ rec_yds }}, 0) * {{ prefix }}rec_yd)
  + (COALESCE({{ rec_tds }}, 0) * {{ prefix }}rec_td)
  + (COALESCE({{ rush_yds }}, 0) * {{ prefix }}rush_yd)
  + (COALESCE({{ rush_tds }}, 0) * {{ prefix }}rush_td)
  + (COALESCE({{ pass_yds }}, 0) * {{ prefix }}pass_yd)
  + (COALESCE({{ pass_tds }}, 0) * {{ prefix }}pass_td)
  + (COALESCE({{ ints }}, 0) * {{ prefix }}int)
  + (COALESCE({{ fumbles }}, 0) * {{ prefix }}fumble)
{%- endmacro %}