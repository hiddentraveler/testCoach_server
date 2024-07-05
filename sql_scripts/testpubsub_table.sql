create table testpubsub(
  testid varchar(20) not null,
  userid varchar(20),
  testname varchar(255),
  responses json,
  totalque int,
  wrong int,
  correct int
);