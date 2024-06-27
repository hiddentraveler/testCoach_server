create table users(
	id varchar(20) unique not null primary key,
    email varchar(255) unique not null,
    username varchar(255) not null,
    pass  binary(60) not null
);
