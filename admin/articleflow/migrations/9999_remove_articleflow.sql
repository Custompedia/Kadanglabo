-- Take ArticleFlow out: drops its tables only. Articles that were published stay in `articles` as ordinary articles.
DROP TABLE IF EXISTS articleflow_outbox;
DROP TABLE IF EXISTS articleflow_cache;
DROP TABLE IF EXISTS articleflow_items;
