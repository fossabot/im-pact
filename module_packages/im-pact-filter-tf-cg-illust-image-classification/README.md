# @arisucool/im-pact-filter-tf-cg-illust-image-classification

[Tweet Filter](https://www.npmjs.com/search?q=keywords%3Aim-pact-filter) for [im pact](https://github.com/arisucool/im-pact).
This tweet filter allows you to extract the tweets, based on whether the attached image of each tweet is an illustration of the Cinderella Girls.

The training model of this classifier uses [tf-cg-illust-classifier](https://github.com/arisucool/tf-cg-illust-classifier).

---

## Usage

This tweet filter is built-in to the im pact.
Therefore, no steps are needed to use it.

---

## For Developers

### Testing

Testing on Docker Compose (recommends if you running the [development environment](https://github.com/arisucool/im-pact/wiki/Dev-StartGuide)):

```
$ sudo docker-compose exec -w /opt/app/module_packages/im-pact-filter-tf-cg-illust-image-classification/ app npm test -- --watchAll
```

Testing on standalone:

```
$ cd module_packages/im-pact-filter-tf-cg-illust-image-classification/
$ npm install
$ npm test -- --watchAll
```

---

## License

Copyright (C) 2021 arisu.cool 🍓 Project (https://github.com/arisucool/).
This software is released under the MIT License.
