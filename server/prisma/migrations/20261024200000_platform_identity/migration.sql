CREATE TABLE "platform_identity" (
 "id" INTEGER PRIMARY KEY CHECK ("id" = 1),
 "content" JSONB NOT NULL,
 "revision" INTEGER NOT NULL DEFAULT 1,
 "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "platform_identity" ("id", "content") VALUES (1, '{"brandName": "GoStudy", "legalName": "Индивидуальный предприниматель Внуков Дмитрий Николаевич", "shortLegalName": "ИП Внуков Дмитрий Николаевич", "inn": "615001269006", "ogrnip": "326619600226065", "registrationDate": "28.09.2026", "registeringAuthority": "Межрайонная инспекция Федеральной налоговой службы № 26 по Ростовской области", "city": "г. Новочеркасск", "automaticEmail": "noreply@gostudyonline.ru", "supportEmail": "support@gostudyonline.ru", "supportPhone": "+7 951 522-06-69", "website": "https://gostudyonline.ru"}'::jsonb);
