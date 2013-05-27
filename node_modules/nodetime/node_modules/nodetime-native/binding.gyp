{
  'targets': [
    {
      'target_name': 'nodetime_native',
      'sources': [
        'src/nodetime_native.cc',
        'src/gc.cc',
        'src/gc.h',
        'src/profiler.cc',
        'src/profiler.h'
      ],
      'conditions': [
        ['OS == "win"', {
            'sources': [
              'src/system_win.cc'
            ]
          }, {
            'sources': [
              'src/system_posix.cc'
            ]
          }
        ],
      ]

    }
  ]
}
