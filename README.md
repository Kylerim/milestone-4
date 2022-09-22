# Google Docs Clone (Server Oriented)


## About
A semester long cloud & server-oriented Google Docs Clone Project in CSE 356 Cloud Computing course at Stony Brook University

## Demonstration
https://youtu.be/XSuOa2gKhAI

## Details
Used Upcloud VMs to scale-out with multiple microservices & maintained QoS requirements (2,700+ RPS with 95th percentile latency at 70ms in OP & 30ms with search/auto-complete in K6 load tests. Integrated login authentication from Postifx email server on VM, document features (texts/media, presence of users’ real-time cursors) using Event Stream & collision handling with ShareDB OT algorithm, search/auto-complete with ElasticSearch, Redis Caching, server traffic handling with NGINX Load balancing, etc.  

## Authors
- Tim Kim (Daekyung Kim)
- Tyler Htet Naing Phyo
- Kyuri Kyeong
