#!/bin/bash

# Bash script to run npm test commands from VS Code launch configurations

$COLOURISER

# Define test configurations as arrays
test_names=(
  "Simple (JSON5)"
  "Simple (YAML)"
  "Advanced (YAML)"
  "Advanced (YAML) (watch)"
  "Advanced (all YAML) (watch)"
  "Advanced (YAML) (resolve)"
)

test_commands=(
  "run-script exec -- build --output-dir ./examples/output ./examples/simple/midnight-ocean.json5"
  "run-script exec -- build --output-dir ./examples/output ./examples/simple/midnight-ocean.yaml"
  "run-script exec -- build --output-dir ./examples/output ./examples/advanced/src/blackboard.yaml"
  "run-script exec -- build --nerd --watch --output-dir ./examples/output ./examples/advanced/src/blackboard.yaml"
  "run-script exec -- build --nerd --watch --output-dir ./examples/output ./examples/advanced/src/blackboard.yaml ./examples/advanced/src/bubblegum-goth.yaml ./examples/advanced/src/corporate.yaml"
  "run-script exec -- resolve --nerd --token statusBarItem.warningHoverBackground ./examples/advanced/src/blackboard.yaml"
)

run_test() {
  local test_name="$1"
  local command="$2"

  echo "Running: $test_name"
  echo "Command: npm $command"
  echo "$(F 226)----------------------------------------$(RST)"

  # Check if this is a watch command
  if [[ "$command" == *"--watch"* ]]; then
    echo "This command uses --watch and will run continuously. Press Ctrl+C to stop."
  fi

  if eval "npm $command"; then
    echo "$test_name completed successfully"
    return 0
  else
    echo "$test_name failed"
    return 1
  fi
}

main() {
  echo "$(F 34)Starting npm test runs...$(RST)"
  echo "$(F 46)=========================$(RST)"
  echo

  local failed_tests=()
  local test_count=${#test_names[@]}

  # Iterate through tests
  for ((i=0; i<test_count; i++)); do
    local test_name="${test_names[$i]}"
    local command="${test_commands[$i]}"

    if ! run_test "$test_name" "$command"; then
      failed_tests+=("$test_name")
    fi

    echo ""
  done

  echo "$(F 46)========================================$(RST)"
  echo "$(F 46)Test run summary:$(RST)"
  echo "$(F 46)========================================$(RST)"
  echo

  if [ ${#failed_tests[@]} -eq 0 ]; then
    echo "All tests completed successfully!"
  else
    echo "$(B 160)$(S R)Failed tests:$(RST)"
    for test in "${failed_tests[@]}"; do
      echo "  - $test"
    done

  echo

    return 1
  fi
}

# Run the main function
main "$@"
